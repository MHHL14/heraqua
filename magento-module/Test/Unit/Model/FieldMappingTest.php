<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Model;

use Herqua\Schoenadviseur\Model\FieldMapping;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\App\Config\Storage\WriterInterface;
use PHPUnit\Framework\TestCase;

final class FieldMappingTest extends TestCase
{
    public function testReturnsDefaultsWhenNothingStored(): void
    {
        $scope = $this->createMock(ScopeConfigInterface::class);
        $scope->method('getValue')->willReturn(null);
        $writer = $this->createMock(WriterInterface::class);

        $mapping = new FieldMapping($scope, $writer);
        $result = $mapping->get();

        $this->assertSame('name', $result['naam']);
        $this->assertSame('price', $result['prijs']);
        $this->assertSame('image', $result['afbeelding']);
        $this->assertSame('manufacturer', $result['merk']);
        $this->assertArrayHasKey('stabiliteit', $result);
        $this->assertSame('', $result['stabiliteit']);
    }

    public function testMergesStoredWithDefaults(): void
    {
        $scope = $this->createMock(ScopeConfigInterface::class);
        $scope->method('getValue')->willReturn(json_encode([
            'stabiliteit' => 'herqua_stability',
            'drop' => 'herqua_drop_mm',
        ]));
        $writer = $this->createMock(WriterInterface::class);

        $mapping = new FieldMapping($scope, $writer);
        $result = $mapping->get();

        $this->assertSame('herqua_stability', $result['stabiliteit']);
        $this->assertSame('herqua_drop_mm', $result['drop']);
        $this->assertSame('name', $result['naam']);
    }

    public function testSaveWritesJson(): void
    {
        $scope = $this->createMock(ScopeConfigInterface::class);
        $writer = $this->createMock(WriterInterface::class);
        $writer->expects($this->once())
            ->method('save')
            ->with(
                'herqua_schoenadviseur/mapping/fields',
                $this->callback(fn($v) => json_decode($v, true)['stabiliteit'] === 'foo')
            );

        $mapping = new FieldMapping($scope, $writer);
        $mapping->save(['stabiliteit' => 'foo']);
    }

    public function testGetRequiredFields(): void
    {
        $scope = $this->createMock(ScopeConfigInterface::class);
        $writer = $this->createMock(WriterInterface::class);
        $mapping = new FieldMapping($scope, $writer);

        $this->assertSame(['naam', 'prijs', 'afbeelding', 'url'], $mapping->getRequiredFields());
    }
}
