<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Controller\Adminhtml\Mapping;

use Herqua\Schoenadviseur\Model\FieldMapping;
use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\Controller\Result\Redirect;

class Save extends Action
{
    public const ADMIN_RESOURCE = 'Herqua_Schoenadviseur::mapping';

    public function __construct(
        Context $context,
        private readonly FieldMapping $fieldMapping
    ) {
        parent::__construct($context);
    }

    public function execute(): Redirect
    {
        $mapping = $this->getRequest()->getParam('mapping');
        $redirect = $this->resultRedirectFactory->create();

        if (!is_array($mapping)) {
            $this->messageManager->addErrorMessage((string)__('No mapping data received'));
            $redirect->setPath('herqua_schoenadviseur/mapping/index');
            return $redirect;
        }

        // Sanitize: only string values
        $clean = [];
        foreach ($mapping as $key => $value) {
            $clean[(string)$key] = (string)$value;
        }

        $this->fieldMapping->save($clean);
        $this->messageManager->addSuccessMessage((string)__('Field mapping saved'));
        $redirect->setPath('herqua_schoenadviseur/mapping/index');
        return $redirect;
    }
}
