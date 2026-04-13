<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Model\Source;

use Magento\Framework\Data\OptionSourceInterface;

class AssetSource implements OptionSourceInterface
{
    /** @return array<int, array<string, mixed>> */
    public function toOptionArray(): array
    {
        return [
            ['value' => 'bundled', 'label' => __('Bundled (module)')],
            ['value' => 'cdn', 'label' => __('CDN')],
        ];
    }
}
